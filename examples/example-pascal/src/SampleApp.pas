unit SampleApp;

interface

uses RunnerSupport, OrderRepository, PricingService, ReceiptView, OrderModel;

type
  TAppRunner = class(TBaseRunner)
  private
    Repository: TOrderRepository;
    Pricing: TPricingService;
    View: TReceiptView;
  public
    constructor Create;
    procedure Start; override;
    procedure Run;
  end;

implementation

constructor TAppRunner.Create;
begin
  Repository := TOrderRepository.Create;
  Pricing := TPricingService.Create;
  View := TReceiptView.Create;
end;

procedure TAppRunner.Start;
begin
  Run;
end;

procedure TAppRunner.Run;
var
  Order: TOrder;
  Total: Currency;
begin
  Order := Repository.CurrentOrder;
  Total := Pricing.TotalFor(Order);
  View.Render(Order, Total);
end;

end.
