using MyApp.Contracts;
using MyApp.Models;
using MyApp.Utils;

namespace MyApp.Services;

public class ApiService : BaseService, IRunner
{
    public RunStatus Run(RunRequest request)
    {
        var current = Status();
        return Helpers.IsRunnable(request, current)
            ? RunStatus.Succeeded
            : RunStatus.Skipped;
    }
}
