namespace BeaconDispatch.Services;

public abstract class RunnerBase
{
    protected const string ReadyStatus = "Dispatch ready";

    protected string Status()
    {
        return ReadyStatus;
    }
}
