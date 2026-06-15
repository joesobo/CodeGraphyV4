namespace BeaconDispatch.Domain;

public struct DispatchRequest
{
    public string Location;
    public DispatchPriority Priority;

    public DispatchRequest(string location, DispatchPriority priority)
    {
        Location = location;
        Priority = priority;
    }
}
