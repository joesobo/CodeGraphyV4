unit OrderRepository;

interface

uses OrderModel;

type
  TOrderRepository = class
  public
    function CurrentOrder: TOrder;
  end;

implementation

function TOrderRepository.CurrentOrder: TOrder;
begin
  Result.Id := 'A-100';
  Result.CustomerName := 'Ada Lovelace';
  Result.Subtotal := 42.00;
end;

end.
