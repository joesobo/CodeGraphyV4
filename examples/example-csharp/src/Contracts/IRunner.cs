namespace MyApp.Contracts;

public interface IRunner
{
    MyApp.Models.RunStatus Run(MyApp.Models.RunRequest request);
}
