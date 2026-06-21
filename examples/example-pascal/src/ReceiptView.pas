unit ReceiptView;

interface

uses OrderModel;

type
  TReceiptView = class
  public
    procedure Render(Order: TOrder; Total: Currency);
  end;

implementation

procedure TReceiptView.Render(Order: TOrder; Total: Currency);
begin
end;

end.
