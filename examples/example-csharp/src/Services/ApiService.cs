using MyApp.Contracts;
using MyApp.Models;
using MyApp.Utils;

namespace MyApp.Services;

public class ApiService : BaseService, IRunner
{
    private readonly string serviceName = "api";

    public RunStatus Run(RunRequest request)
    {
        var currentStatus = $"{serviceName}:{Status()}";
        var isRunnable = Helpers.IsRunnable(request, currentStatus);

        return isRunnable
            ? RunStatus.Succeeded
            : RunStatus.Skipped;
    }
}
