using System.Linq;

namespace MyApp.Utils
{
    /// <summary>
    /// Helper utilities.
    /// </summary>
    public static class Helpers
    {
        public static string ProcessData(string[] data)
        {
            if (data == null || data.Length == 0)
            {
                return Formatter.FormatOutput("No data");
            }

            var processed = data.Select(item => item.ToUpper());
            return Formatter.FormatOutput(string.Join(", ", processed));
        }
    }
}
