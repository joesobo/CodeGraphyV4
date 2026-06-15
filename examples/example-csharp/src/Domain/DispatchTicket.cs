namespace BeaconDispatch.Domain;

public class DispatchTicket
{
    public const string DefaultCrew = "Field Team";

    private readonly string _crew;

    private DispatchTicket(DispatchRequest request, string crew)
    {
        Request = request;
        _crew = crew;
    }

    public DispatchRequest Request { get; }

    public static DispatchTicket Create(DispatchRequest request)
    {
        var crew = DefaultCrew;
        return new DispatchTicket(request, crew);
    }

    public string AssignedCrew()
    {
        return _crew;
    }
}
