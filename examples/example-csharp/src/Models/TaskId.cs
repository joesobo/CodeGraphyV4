namespace ExampleCSharp.Models
{
    public readonly struct TaskId
    {
        private readonly string _value;

        public TaskId(string value)
        {
            _value = value;
        }

        public string Value
        {
            get
            {
                return _value;
            }
        }

        public override string ToString()
        {
            return _value;
        }
    }
}
