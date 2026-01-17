<Query Kind="Program" />

#load ".\DevGrowEngine"

void Main()
{
    var engine = new DevGrowEngine(1);
    
    List<(int Time, ItemInfo Item)> BuyItems = new List<(int Time, UserQuery.ItemInfo Item)>();

    while (engine.View.Lines < int.MaxValue)
    {
        engine.Next();
        if (engine.Seconds % 10 == 0)
        {
            var bestItem = simulate(engine);
            
            if (bestItem != null)
            {
                engine.BuyItem(bestItem);
                BuyItems.Add((engine.Seconds, bestItem));
            }
        }
    }

    engine.View.Dump(1);
    engine.Dump(1);
    BuyItems.Dump(1);
}

public ItemInfo? simulate(DevGrowEngine engine)
{
    var remainTimeNoItem = SimulateWithItem(engine, null);
    
    if (engine.View.Lines > 500_000_000)
    {
        return null;
    }
    
    var results = items
        .Where(x => x.Cost <= engine.View.Lines)
        .AsParallel()
        .Select(item =>
        {
            var remainTime = SimulateWithItem(engine, item);
            return new {
                Item = item,
                RemainTime = remainTime,
            };
        })
        .Where(x => x.RemainTime > 0)
        .OrderBy(x => x.RemainTime)
        .ToArray();
        
    var bestItem = results.FirstOrDefault();
    
    if (bestItem?.RemainTime < remainTimeNoItem - 1)
    {
        return bestItem.Item;
    }
    else
    {
        return null;
    }
}

public int SimulateWithItem(DevGrowEngine engine, ItemInfo? item)
{
    var lines = engine.View.Lines;
    var lps = engine.View.Lps;
    
    if (item?.Cost <= lines)
    {
        lines -= item.Cost;
        lps += (long)(item.BaseEffect * engine.BonusLps + 1);
    }
    
    var time = 0;
    while (lines < int.MaxValue)
    {
        time++;
        lines += lps;
        if ((engine.Seconds + time) % 46 == 0)
        {
            lines += Math.Clamp(lines / 10, 100_000, 20_000_000);
        }
    }
    return time;
}