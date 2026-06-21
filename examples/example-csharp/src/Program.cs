using System;
using ExampleCSharp.Config;
using ExampleCSharp.Models;
using ExampleCSharp.Services;

namespace ExampleCSharp
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var settings = new DispatchSettings(maxRetries: 3);
            var queue = new PriorityTaskQueue();
            var dispatcher = new TaskDispatcher(queue, settings);
            var task = new DispatchTask(
                new TaskId("graph-refresh"),
                "Refresh Graph Cache",
                DispatchStatus.Pending);

            dispatcher.Completed += ReportCompletion;
            var result = dispatcher.Dispatch(task);

            Console.WriteLine(result.Message);
        }

        private static void ReportCompletion(DispatchTask task, DispatchResult result)
        {
            Console.WriteLine($"{task.Title}: {result.Status}");
        }
    }
}
