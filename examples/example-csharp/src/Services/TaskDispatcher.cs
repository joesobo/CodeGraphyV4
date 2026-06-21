using ExampleCSharp.Config;
using ExampleCSharp.Contracts;
using ExampleCSharp.Events;
using ExampleCSharp.Models;

namespace ExampleCSharp.Services
{
    public class TaskDispatcher : BaseTaskRunner, ITaskRunner
    {
        private readonly ITaskQueue _queue;
        private readonly DispatchSettings _settings;

        public event TaskCompleted? Completed;

        public TaskDispatcher(ITaskQueue queue, DispatchSettings settings)
        {
            _queue = queue;
            _settings = settings;
        }

        public DispatchResult Dispatch(DispatchTask task)
        {
            const int retryFloor = 1;
            var attempts = retryFloor + _settings.MaxRetries;

            string BuildMessage(DispatchTask dispatchedTask)
            {
                return $"{dispatchedTask.Title} finished after {attempts} attempts";
            }

            _queue.Enqueue(task);
            var nextTask = _queue.Dequeue();
            var result = Complete(nextTask, BuildMessage(nextTask));

            Completed?.Invoke(nextTask, result);

            return result;
        }
    }
}
