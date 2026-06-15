using BeaconDispatch.Contracts;
using BeaconDispatch.Domain;
using BeaconDispatch.Presentation;

namespace BeaconDispatch.Services;

public class DispatchRunner : RunnerBase, IDispatchRunner
{
    private readonly DispatchQueue _queue;

    private DispatchRunner(DispatchQueue queue)
    {
        _queue = queue;
    }

    public static DispatchRunner CreateDefault()
    {
        return new DispatchRunner(new DispatchQueue());
    }

    public string Run(string location, DispatchPriority priority)
    {
        var request = new DispatchRequest(location, priority);
        var ticket = DispatchTicket.Create(request);
        _queue.Enqueue(ticket);

        var status = Status();
        var activeTickets = _queue.Count();
        return DispatchReport.Format(ticket, $"{status} with {activeTickets} active tickets");
    }
}
