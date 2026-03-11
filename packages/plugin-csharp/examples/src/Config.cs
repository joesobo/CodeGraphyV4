namespace MyApp
{
    /// <summary>
    /// Application configuration.
    /// </summary>
    public class Config
    {
        public string ApiUrl { get; set; } = "https://api.example.com";
        public int Timeout { get; set; } = 30;
        public bool Debug { get; set; } = false;

        public static Config LoadConfig()
        {
            return new Config();
        }
    }
}
