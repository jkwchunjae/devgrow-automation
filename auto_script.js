// ==UserScript==
// @name         DevGrow 자동화
// @namespace    http://tampermonkey.net/
// @version      2026-01-13
// @description  DevGrow 자동화
// @author       jkw
// @match        https://www.devgrow.co.kr/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=devgrow.co.kr
// @grant        none
// ==/UserScript==

var lastStartTime = 0;

var bugIntervals = [];
var bugIntervalAverage = 0;
var lastBugTime = 0;

var stockOption = 0;

var currentStatus = null;
/*
currentStatus: {
  clickPower: 1,
  items: {},
  lines: 58392,
  lps: 30000
}
*/

var costTable = [];
/*
costTable: [
  {
    lps: 5000,
    cost: 34000200
    card: HTMLDivElement
  },
  {
    lps: 550,
    cost: 400000,
    card: HTMLDivElement
  }
]
*/

(function() {
    'use strict';

    setInterval(() => initAction(), 3000);

    setInterval(() => fixBug(), 1000);
    setInterval(() => updateCostTable(), 1000);
    setInterval(() => aiRefactoring(), 1000);
    setInterval(() => getStockOption(), 1000);
    setInterval(() => simulateAndExecute(), 5000);
    setInterval(() => exitAndRestart(), 5000);

    fetchHookAndUpdateCurrentStatus();
})();

function elementClick(element) {
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, cancelable:true }));
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles:true, cancelable:true }));
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, cancelable:true }));
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles:true, cancelable:true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true }));
}

function initAction() {
    const autoButton = [...document.querySelectorAll('button')]
        .find(btn => btn.innerText.includes('자동화'));

    if (autoButton && autoButton.getAttribute('data-state') === 'inactive') {
        autoButton.scrollIntoView({block:'center'});

        elementClick(autoButton);
    }
}

function aiRefactoring() {
    if (currentStatus && currentStatus.lps > 1500000) {
        [...document.querySelectorAll('button')]
            .find(btn => btn.innerText.includes('AI 리팩토링'))
            ?.click();
    }
}

function fixBug() {
    const containers = document.querySelectorAll('.text-red-500.z-9999');
    containers.forEach(container => {
        var currentBugTime = Date.now();
        if (lastBugTime === 0) {
            lastBugTime = currentBugTime;
        } else {
            var bugInterval = Math.floor((currentBugTime - lastBugTime) / 1000);
            bugIntervals.push(bugInterval);
            // 마지막 10개만 저장
            bugIntervals = bugIntervals.slice(-10);
            bugIntervalAverage = Math.floor(bugIntervals.reduce((a, b) => a + b, 0) / bugIntervals.length);
            lastBugTime = currentBugTime;
            // console.log('bug', bugIntervalAverage, bugIntervals);
        }
        const clickable = container.querySelector('div.cursor-pointer');
        if (clickable && !clickable.__clicked) {
            clickable.__clicked = true; // 중복 클릭 방지
            clickable.click();
        }
    });
}

function updateCostTable() {
    const container = document.querySelector('div[id$="content-auto"]');
    if (!container) {
        console.warn('컨테이너를 찾을 수 없습니다.');
        return;
    }

    const localCostTable = [];

    const cards = container.querySelectorAll('[data-slot="tooltip-trigger"]');
    cards.forEach(card => {
        const rateEl = [...card.querySelectorAll('.text-gray-400')]
            .find(el => el.innerText.trim().startsWith('초당'));
        const costEl = card.querySelector('.font-mono');
        if (!rateEl || !costEl) {
            return;
        }
        // 초당 코드 추출
        const match = rateEl.innerText.match(/\+(\d+)/);
        if (!match) {
            return;
        }
        const lps = Number(match[1]);
        const cost = Number(costEl.innerText.replaceAll(',', ''));
        if (!lps || !cost) {
            return;
        }

        localCostTable.push({ lps, cost, card });
    });

    costTable = localCostTable;
    // console.log('costTable', costTable);
}

function fetchHookAndUpdateCurrentStatus() {
    const originalFetch = window.fetch;

    window.fetch = async function (input, init = {}) {
        try {
            const url = typeof input === 'string' ? input : input.url;
            const method = (init.method || 'GET').toUpperCase();

            if (method === 'POST' && url.endsWith('/ide')) {
                var body = JSON.parse(init.body);
                currentStatus = body[0];
                // console.log('currentStatus', currentStatus);
            }
        } catch (e) {
            console.error('[Fetch Hook Error]', e);
        }

        // 실제 fetch 실행
        return originalFetch.apply(this, arguments);
    };

    console.log('[Tampermonkey] fetch hook installed');
}

function getStockOption() {
    if (stockOption > 0) {
        return;
    }

    // 1) "스톡 옵션"을 포함한 '요소'를 찾는다
    const stockLabelEl = Array.from(document.querySelectorAll('*'))
      .find(el => el.textContent?.trim() === '스톡 옵션');

    if (!stockLabelEl) {
      console.log('스톡 옵션 라벨을 찾지 못했습니다.');
      return;
    }

    // 2) "스톡 옵션"이 있는 위치에서 상위로 올라가며,
    //    카드 컨테이너(rounded-xl)를 찾는다 (없으면 가장 가까운 div라도 사용)
    const cardEl =
      stockLabelEl.closest('div.rounded-xl') ||
      stockLabelEl.closest('div');

    if (!cardEl) {
      console.log('스톡 옵션이 속한 상위 컨테이너를 찾지 못했습니다.');
      return;
    }

    // 3) 카드 내부로 다시 내려가서 "초당 코드 생산량" 라벨을 찾는다
    const throughputLabelEl = Array.from(cardEl.querySelectorAll('*'))
      .find(el => el.textContent?.trim() === '초당 코드 생산량');

    if (!throughputLabelEl) {
      console.log('카드 안에서 "초당 코드 생산량" 라벨을 찾지 못했습니다.');
      return;
    }

    // 4) 라벨의 다음 형제 요소가 값(+400%)인 구조를 가정하고 숫자만 추출
    const valueEl = throughputLabelEl.nextElementSibling;

    if (!valueEl) {
      console.log('"초당 코드 생산량" 라벨의 값 요소를 찾지 못했습니다.');
      return;
    }

    const match = valueEl.textContent.match(/\d+/);
    const value = match ? Number(match[0]) : null;

    console.log('초당 코드 생산량:', value);
    stockOption = value;
}

function simulateAndExecute() {
    if (!currentStatus || bugIntervalAverage === 0) {
        return;
    }

    const timeNoItem = simulateWithItem(null);
    updateRemainTime(timeNoItem);

    if (!costTable || costTable.length === 0 || currentStatus.lines === 0) {
        return;
    }

    if (currentStatus.lines > 500000000) {
        // 5억 넘어가면 계산하는게 의미가 없다.
        return;
    }

    const results = costTable
        .filter(item => item.cost <= currentStatus.lines)
        .filter(item => item.lps >= 30)
        .map(item => {
            const time = simulateWithItem(item);
            return {
                ...item,
                time: time
            }
        })
        .filter(item => item.time > 0)
        .sort((a, b) => a.time - b.time);

    const bestItem = results[0];

    // console.log('simulate', timeNoItem, results);

    if (bestItem.time < timeNoItem - 1) {
        console.log('execute', {
            remainTime: timeNoItem,
            newTime: bestItem.time,
            diff: timeNoItem - bestItem.time
        }, { lps: bestItem.lps, cost: bestItem.cost });
        bestItem.card.click();
    } else {
        // console.log('no execute');
    }

}

function simulateWithItem(item) {
    if (!currentStatus || bugIntervalAverage === 0) {
        return 0;
    }

    const goal = 2147483647;
    var lines = currentStatus.lines;
    var lps = currentStatus.lps;

    // use item
    if (item && item.cost <= lines) {
        lines -= item.cost;
        lps += item.lps + item.lps * stockOption / 100;
    }

    var time = 1;
    while (lines < goal) {
        time++;
        lines += lps;
        if (Math.floor(((Date.now() - lastBugTime) / 1000 + time) % bugIntervalAverage) === 0) {
            // 버그를 잡으면 최대 2000만, 최소 10만 줄을 얻는다.
            lines += Math.max(100000, Math.min(20000000, (lines / 10)));
        }
    }
    return time;
}

function exitAndRestart() {
    const exitButton = [...document.querySelectorAll('button')]
        .find(btn => btn.innerText.includes('보너스'));

    if (exitButton) {
        setTimeout(() => {
            elementClick(exitButton);
            bugIntervals = [];
            bugIntervalAverage = 0;
            lastBugTime = 0;
            stockOption = 0;
            currentStatus = {
                clickPower: 1,
                items: {},
                lines: 58392,
                lps: 30000
            };
            costTable = [];

            setTimeout(() => {
                const startButton = [...document.querySelectorAll('button')]
                    .find(btn => btn.innerText.includes('시작하기'));

                if (startButton) {
                    if (lastStartTime > 0) {
                        console.log('start', (Date.now() - lastStartTime) / 1000);
                    }
                    lastStartTime = Date.now();
                    elementClick(startButton);
                    lastBugTime = Date.now();
                    bugIntervals = [];
                    bugIntervalAverage = 46;
                    currentStatus = {
                        clickPower: 1,
                        items: {},
                        lines: 0,
                        lps: 0
                    };
                }
            }, 5000);
        }, 5000);
    }
}


function findContainerByDevSpeedText() {
    const paragraphs = document.querySelectorAll('p');

    for (const p of paragraphs) {
        if (p.textContent.trim() === '개발속도') {
            // 개발속도 텍스트를 포함하는 최상위 컨테이너
            return p.closest('.px-4.py-2');
        }
    }

    return null;
}

function findDevSpeedBlock() {
    const ps = document.querySelectorAll('p');
    for (const p of ps) {
        if (p.textContent.trim() === '개발속도') {
            return p.parentElement; // 개발속도 전체 블록
        }
    }
    return null;
}

function convertTimeToText(timeSecond) {
    const hours = Math.floor(timeSecond / 3600);
    const minutes = Math.floor((timeSecond % 3600) / 60);
    const seconds = timeSecond % 60;

    if (hours > 0) {
        return `${hours}시간 ${minutes}분`;
    } else if (minutes > 0) {
        return `${minutes}분`;
    } else {
        return `${seconds}초`;
    }
}
function calcFinishTime(remainTime) {
    return Date.now() + remainTime * 1000;
}

function updateRemainTime(remainTime) {
    const container = findContainerByDevSpeedText();
    if (!container) return;

    const remainTimeText = convertTimeToText(remainTime);
    const finishTime = new Date(calcFinishTime(remainTime));
    const finishTimeText = `${finishTime.getHours().toString().padStart(2, '0')}:${finishTime.getMinutes().toString().padStart(2, '0')}`;
    let remainEl = container.querySelector('.remain-time');

    if (!remainEl) {
        remainEl = document.createElement('div');
        remainEl.className = 'remain-time flex flex-col items-center';

        remainEl.innerHTML = `
            <p class="text-xs text-gray-400 tracking-widest text-center">
                남은 시간
            </p>
            <div class="remain-time-value text-xl font-bold text-yellow-400 text-center">
                ${remainTimeText}
            </div>
            <div class="finish-time text-xs text-gray-400 tracking-widest text-center">
                ${finishTimeText}
            </div>
        `;

        // 개발속도 블록 바로 앞에 삽입
        const devSpeedBlock = findDevSpeedBlock();

        container.insertBefore(remainEl, devSpeedBlock);
    } else {
        remainEl.querySelector('.remain-time-value').textContent = remainTimeText;
        remainEl.querySelector('.finish-time').textContent = finishTimeText;
    }
}