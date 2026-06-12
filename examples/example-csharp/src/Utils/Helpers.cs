namespace MyApp.Utils;

public static class Helpers
{
    public static bool IsRunnable(MyApp.Models.RunRequest request, string currentStatus)
    {
        return request.MaxItems > 0 && currentStatus == "ready";
    }

    public static string FormatStatus(MyApp.Models.RunStatus status)
    {
        return Formatter.FormatOutput(status);
    }
}
