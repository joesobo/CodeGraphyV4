using BeaconDispatch.Domain;

namespace BeaconDispatch.Contracts;

public interface IDispatchRunner
{
    string Run(string location, DispatchPriority priority);
}
