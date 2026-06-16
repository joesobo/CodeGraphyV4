namespace ExampleCSharp.Config
{
    public class DispatchSettings
    {
        public const int DefaultMaxRetries = 2;

        private readonly int _maxRetries;

        public DispatchSettings(int maxRetries)
        {
            _maxRetries = maxRetries;
        }

        public int MaxRetries
        {
            get
            {
                return _maxRetries;
            }
        }
    }
}
