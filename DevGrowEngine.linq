<Query Kind="Program" />

public record struct View(int Time, long Lines, long Lps);

public class DevGrowEngine(double bonusLps)
{
    public double BonusLps { get; init; } = bonusLps;
    public Status CurrentStatus { get; private set; } = Status.Default;
    public AiTimeData AiTime { get; private set; } = AiTimeData.Default;
    public TimeSpan Time { get; private set; } = TimeSpan.Zero;
    public TimeSpan NextBugTime { get; private set; } = TimeSpan.FromSeconds(46);

    public View View => new View((int)Time.TotalSeconds, CurrentStatus.Lines, CurrentStatus.Lps);
    
    public View Next(int seconds)
    {
        for (var i = 0; i < seconds; i++)
        {
            Next();
        }
        return View;
    }

    public View Next()
    {
        Time = Time.Add(TimeSpan.FromSeconds(1));
        CurrentStatus = CurrentStatus with
        {
            Lines = CurrentStatus.Lines
                 + CurrentStatus.Lps
                 + (AiTime.IsAiTime ? CurrentStatus.Lps : 0)
                 + (Time == NextBugTime ? Math.Clamp((long)(CurrentStatus.Lines / 10), 100_000, 20_000_000) : 0L),
        };
        if (Time == AiTime.WhenFinishAiTime)
        {
            AiTime = AiTime.FinishAiTime(Time);
        }
        else if (Time == AiTime.WhenFinishCpuTime)
        {
            AiTime = AiTime.FinishCpuTime(Time);
        }
        if (Time == NextBugTime)
        {
            NextBugTime += TimeSpan.FromSeconds(46);
        }
        return View;
    }

    public void RunAi()
    {
        AiTime = AiTime.RunAi(Time);
    }
    
    public void BuyItem(ItemInfo item)
    {
        var currentItem = CurrentStatus.Items
            .FirstOrDefault(x => x.Info.Id == item.Id);
        if (currentItem == default)
        {
            CurrentStatus.Items.Add(new Item
            {
                Info = item,
                Effect = item.BaseEffect,
                Level = 1,
            });
        }
        else
        {
            var cost = (int)Math.Round(item.BaseCost * Math.Pow(item.CostMultiplier, currentItem.Level));
            currentItem.Effect += item.BaseCost;
            currentItem.Level++;
            CurrentStatus = CurrentStatus with
            {
                Lines = CurrentStatus.Lines - cost,
                Lps = (int)(CurrentStatus.Items.Sum(x => x.Effect) * (BonusLps + 1)),
            };
        }
    }
}

public record AiTimeData
{
    public bool AiTimeAvailable { get; set; }
    public bool IsAiTime { get; set; }
    public TimeSpan WhenFinishAiTime { get; set; }
    public bool IsCpuTime { get; set; }
    public TimeSpan WhenFinishCpuTime { get; set; }
    
    public static readonly AiTimeData Default = new AiTimeData
    {
        AiTimeAvailable = true,
        IsAiTime = false,
        WhenFinishAiTime = default,
        IsCpuTime = false,
        WhenFinishCpuTime = default,
    };
    
    public AiTimeData RunAi(TimeSpan currentTime)
    {
        return this with
        {
            AiTimeAvailable = false,
            IsAiTime = true,
            WhenFinishAiTime = currentTime.Add(TimeSpan.FromSeconds(30)),
        };
    }
    
    public AiTimeData FinishAiTime(TimeSpan currentTime)
    {
        return this with
        {
            IsAiTime = false,
            IsCpuTime = true,
            WhenFinishCpuTime = currentTime.Add(TimeSpan.FromMinutes(30)),
        };
    }

    public AiTimeData FinishCpuTime(TimeSpan currentTime)
    {
        return this with
        {
            AiTimeAvailable = true,
            IsCpuTime = false,
        };
    }
}

public record Status
{
    public long Lines { get; set; }
    public long Lps { get; set; }
    public required List<Item> Items { get; set; }
    
    public static readonly Status Default = new Status
    {
        Lines = 0,
        Lps = 0,
        Items = new List<Item>(),
    };
}

public class Item
{
    public required ItemInfo Info { get; set; }
    public int Level { get; set; }
    public long Effect { get; set; }
}

public class ItemInfo
{
    public required string Id { get; set; }
    public required string Type { get; set; }
    public long BaseCost { get; set; }
    public long BaseEffect { get; set; }
    public double CostMultiplier { get; set; }
}

public ItemInfo[] items = [
    new ItemInfo { Id = "click_basic", Type = "CLICK", BaseCost = 10, BaseEffect = 1, CostMultiplier = 1.5 },
    new ItemInfo { Id = "click_old_keyboard", Type = "CLICK", BaseCost = 100, BaseEffect = 2, CostMultiplier = 1.6 },
    new ItemInfo { Id = "click_gaming_mouse", Type = "CLICK", BaseCost = 250, BaseEffect = 3, CostMultiplier = 1.5 },
    new ItemInfo { Id = "click_office_chair", Type = "CLICK", BaseCost = 500, BaseEffect = 5, CostMultiplier = 1.7 },
    new ItemInfo { Id = "click_stackoverflow", Type = "CLICK", BaseCost = 900, BaseEffect = 8, CostMultiplier = 1.6 },
    new ItemInfo { Id = "click_curved_monitor", Type = "CLICK", BaseCost = 1500, BaseEffect = 12, CostMultiplier = 1.6 },
    new ItemInfo { Id = "click_standing_desk", Type = "CLICK", BaseCost = 5000, BaseEffect = 35, CostMultiplier = 1.7 },
    new ItemInfo { Id = "click_macbook", Type = "CLICK", BaseCost = 12000, BaseEffect = 80, CostMultiplier = 1.6 },
    new ItemInfo { Id = "click_ai", Type = "CLICK", BaseCost = 25000, BaseEffect = 150, CostMultiplier = 1.8 },
    new ItemInfo { Id = "click_hacker", Type = "CLICK", BaseCost = 70000, BaseEffect = 200, CostMultiplier = 1.75 },
    new ItemInfo { Id = "click_trillion_code", Type = "CLICK", BaseCost = 150000, BaseEffect = 200, CostMultiplier = 1.9 },
    new ItemInfo { Id = "click_guild", Type = "CLICK", BaseCost = 600000, BaseEffect = 750, CostMultiplier = 1.8 },
    new ItemInfo { Id = "click_rocket", Type = "CLICK", BaseCost = 5000000, BaseEffect = 4500, CostMultiplier = 2.0 },
    new ItemInfo { Id = "auto_junior", Type = "AUTO", BaseCost = 20, BaseEffect = 1, CostMultiplier = 1.4 },
    new ItemInfo { Id = "auto_intern", Type = "AUTO", BaseCost = 60, BaseEffect = 2, CostMultiplier = 1.45 },
    new ItemInfo { Id = "auto_mid", Type = "AUTO", BaseCost = 150, BaseEffect = 3, CostMultiplier = 1.5 },
    new ItemInfo { Id = "auto_senior", Type = "AUTO", BaseCost = 400, BaseEffect = 6, CostMultiplier = 1.55 },
    new ItemInfo { Id = "auto_teamlead", Type = "AUTO", BaseCost = 1000, BaseEffect = 10, CostMultiplier = 1.6 },
    new ItemInfo { Id = "auto_tech_writer", Type = "AUTO", BaseCost = 2200, BaseEffect = 20, CostMultiplier = 1.5 },
    new ItemInfo { Id = "auto_copilot", Type = "AUTO", BaseCost = 3500, BaseEffect = 30, CostMultiplier = 1.65 },
    new ItemInfo { Id = "auto_tech_seminar", Type = "AUTO", BaseCost = 8000, BaseEffect = 60, CostMultiplier = 1.6 },
    new ItemInfo { Id = "auto_remote_work", Type = "AUTO", BaseCost = 15000, BaseEffect = 100, CostMultiplier = 1.7 },
    new ItemInfo { Id = "auto_cicd", Type = "AUTO", BaseCost = 50000, BaseEffect = 120, CostMultiplier = 1.6 },
    new ItemInfo { Id = "auto_server_room", Type = "AUTO", BaseCost = 100000, BaseEffect = 150, CostMultiplier = 1.8 },
    new ItemInfo { Id = "auto_hire_junior", Type = "AUTO", BaseCost = 400000, BaseEffect = 550, CostMultiplier = 1.75 },
    new ItemInfo { Id = "auto_ai_center", Type = "AUTO", BaseCost = 5000000, BaseEffect = 5000, CostMultiplier = 1.9 }
];