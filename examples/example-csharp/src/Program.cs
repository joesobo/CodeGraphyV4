using MyApp.Models;
using MyApp.Services;
using MyApp.Utils;

namespace MyApp;

class Program
{
    static void Main(string[] args)
    {
        var settings = Config.LoadConfig();
        var service = new ApiService();
        var request = new RunRequest("daily-sync", settings.MaxItems);
        var status = service.Run(request);
        var output = Helpers.FormatStatus(status);

        System.Console.WriteLine(output);
    }
}
