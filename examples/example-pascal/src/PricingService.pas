unit PricingService;

interface

uses OrderModel;

type
  TPricingService = class
  public
    function TotalFor(Order: TOrder): Currency;
  end;

implementation

function TPricingService.TotalFor(Order: TOrder): Currency;
begin
  Result := Order.Subtotal * 1.10;
end;

end.
