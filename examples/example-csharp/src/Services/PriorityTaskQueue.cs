using System.Collections.Generic;
using ExampleCSharp.Contracts;
using ExampleCSharp.Models;

namespace ExampleCSharp.Services
{
    public class PriorityTaskQueue : ITaskQueue
    {
        private readonly Queue<DispatchTask> _tasks;

        public PriorityTaskQueue()
        {
            _tasks = new Queue<DispatchTask>();
        }

        public int Count
        {
            get
            {
                return _tasks.Count;
            }
        }

        public void Enqueue(DispatchTask task)
        {
            _tasks.Enqueue(task);
        }

        public DispatchTask Dequeue()
        {
            return _tasks.Dequeue();
        }
    }
}
