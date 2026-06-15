using System;
using BeaconDispatch.Domain;
using BeaconDispatch.Services;

namespace BeaconDispatch;

public static class Program
{
    public static void Main(string[] args)
    {
        var runner = DispatchRunner.CreateDefault();
        var location = args.Length > 0 ? args[0] : "north pier";
        var report = runner.Run(location, DispatchPriority.Normal);

        Console.WriteLine(report);
    }
}
