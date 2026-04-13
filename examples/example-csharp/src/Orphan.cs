namespace MyApp
{
    /// <summary>
    /// An orphan class with no usings or dependents.
    /// This file is used to test the showOrphans setting.
    /// When showOrphans=false, this file should not appear in the graph.
    /// </summary>
    public class Orphan
    {
        public string StandaloneMethod()
        {
            return "I'm all alone";
        }
    }
}
