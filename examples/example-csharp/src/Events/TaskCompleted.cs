using ExampleCSharp.Models;

namespace ExampleCSharp.Events
{
    public delegate void TaskCompleted(DispatchTask task, DispatchResult result);
}
