using BeaconDispatch.Domain;

namespace BeaconDispatch.Presentation;

public static class DispatchReport
{
    public static string Format(DispatchTicket ticket, string status)
    {
        var crew = ticket.AssignedCrew();
        return $"{status}: {ticket.Request.Priority} response to {ticket.Request.Location} by {crew}";
    }
}
