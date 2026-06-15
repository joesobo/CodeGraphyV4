using System.Collections.Generic;
using BeaconDispatch.Domain;

namespace BeaconDispatch.Services;

public class DispatchQueue
{
    private readonly List<DispatchTicket> _tickets = new();

    public void Enqueue(DispatchTicket ticket)
    {
        _tickets.Add(ticket);
    }

    public int Count()
    {
        var total = _tickets.Count;
        return total;
    }
}
