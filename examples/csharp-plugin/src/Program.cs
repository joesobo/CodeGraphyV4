using System;
using MyApp.Services;
using MyApp.Utils;

namespace MyApp
{
    /// <summary>
    /// Main entry point for the application.
    /// </summary>
    class Program
    {
        static void Main(string[] args)
        {
            var settings = Config.LoadConfig();
            var api = new ApiService();
            
            var data = api.FetchData(settings.ApiUrl);
            var result = Helpers.ProcessData(data);
            
            Console.WriteLine(result);
        }
    }
}
