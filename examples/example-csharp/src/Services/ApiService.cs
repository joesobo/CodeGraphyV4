using MyApp.Contracts;
using MyApp.Utils;

namespace MyApp.Services
{
    /// <summary>
    /// API service for fetching data.
    /// </summary>
    public class ApiService : BaseService, IRunner
    {
        public string Run()
        {
            return Status();
        }

        /// <summary>
        /// Fetch data from the API.
        /// This is a mock implementation for testing.
        /// </summary>
        public string[] FetchData(string url)
        {
            // In real code, this would make HTTP requests
            return new[] { "apple", "banana", "cherry" };
        }

        public object PostData(string url, object payload)
        {
            return new { Status = "ok", Url = url };
        }
    }
}
