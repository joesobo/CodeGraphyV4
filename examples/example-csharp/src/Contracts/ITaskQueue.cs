using ExampleCSharp.Models;

namespace ExampleCSharp.Contracts
{
    public interface ITaskQueue
    {
        int Count { get; }

        void Enqueue(DispatchTask task);

        DispatchTask Dequeue();
    }
}
