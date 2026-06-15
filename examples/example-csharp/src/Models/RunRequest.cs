namespace MyApp.Models;

public struct RunRequest
{
    public const string DefaultName = "daily-sync";
    public readonly string Name;
    public readonly int MaxItems;

    public RunRequest(string name, int maxItems)
    {
        Name = name;
        MaxItems = maxItems;
    }
}
