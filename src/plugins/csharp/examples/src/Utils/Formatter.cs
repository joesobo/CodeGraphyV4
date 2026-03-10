namespace MyApp.Utils
{
    /// <summary>
    /// Formatting utilities.
    /// </summary>
    public static class Formatter
    {
        public static string FormatOutput(string text)
        {
            return $"[OUTPUT] {text}";
        }

        public static string FormatError(string message)
        {
            return $"[ERROR] {message}";
        }
    }
}
