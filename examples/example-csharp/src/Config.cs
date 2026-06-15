namespace MyApp;

public class Config
{
    public const int DefaultMaxItems = 3;

    public string ApiUrl { get; set; } = "https://api.example.com";
    public int MaxItems { get; set; } = DefaultMaxItems;
    public bool Debug { get; set; } = false;

    public static Config LoadConfig()
    {
        return new Config
        {
            ApiUrl = "https://api.example.com"
        };
    }
}
