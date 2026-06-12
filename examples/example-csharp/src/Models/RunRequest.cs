namespace MyApp.Models;

public struct RunRequest
{
    public RunRequest(string name, int maxItems)
    {
        Name = name;
        MaxItems = maxItems;
    }

    public string Name { get; }
    public int MaxItems { get; }
}
