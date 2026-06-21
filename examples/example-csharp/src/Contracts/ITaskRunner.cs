using ExampleCSharp.Models;

namespace ExampleCSharp.Contracts
{
    public interface ITaskRunner
    {
        DispatchResult Dispatch(DispatchTask task);
    }
}
