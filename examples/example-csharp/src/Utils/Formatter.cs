namespace MyApp.Utils;

public static class Formatter
{
    public static string FormatOutput(MyApp.Models.RunStatus status)
    {
        return $"[OUTPUT] {status}";
    }
}
