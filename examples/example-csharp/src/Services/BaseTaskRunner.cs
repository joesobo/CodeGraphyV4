using ExampleCSharp.Models;

namespace ExampleCSharp.Services
{
    public class BaseTaskRunner
    {
        public BaseTaskRunner()
        {
        }

        protected DispatchResult Complete(DispatchTask task, string message)
        {
            return new DispatchResult(task.Id, DispatchStatus.Completed, message);
        }
    }
}
