# Pascal Example

Small Pascal workspace for checking CodeGraphy's Core Pascal coverage with an app runner, repository, pricing service, receipt view, and shared order model.

Open `examples/example-pascal` in CodeGraphy and look for:

- `src/Main.pas -> src/SampleApp.pas#import`
- `src/SampleApp.pas -> src/RunnerSupport.pas#import`
- `src/SampleApp.pas -> src/OrderRepository.pas#import`
- `src/SampleApp.pas -> src/PricingService.pas#import`
- `src/SampleApp.pas -> src/ReceiptView.pas#import`
- `src/OrderRepository.pas -> src/OrderModel.pas#import`
- `SampleApp.pas -> TBaseRunner#inherit`

## Symbol Node Demo

Suggested symbol check:

1. Open `src/SampleApp.pas`.
2. In Graph Scope, enable **Symbol**.
3. Search for `TAppRunner`, `TOrderRepository`, `TPricingService`, `TReceiptView`, `TOrder`, and `Run`.

Expected behavior:

- Pascal unit `uses` relationships connect source files.
- Class, record, function, and procedure symbols make the unit graph inspectable.
