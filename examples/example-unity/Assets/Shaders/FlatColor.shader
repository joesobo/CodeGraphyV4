Shader "Example/Flat Color"
{
    Properties
    {
        _Color ("Color", Color) = (1, 1, 1, 1)
    }

    SubShader
    {
        Tags
        {
            "RenderType" = "Opaque"
            "Queue" = "Geometry"
        }

        Pass
        {
            Name "FlatColor"

            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "UnityCG.cginc"

            fixed4 _Color;

            struct Attributes
            {
                float4 vertex : POSITION;
            };

            struct Varyings
            {
                float4 vertex : SV_POSITION;
            };

            Varyings vert(Attributes input)
            {
                Varyings output;
                output.vertex = UnityObjectToClipPos(input.vertex);
                return output;
            }

            fixed4 frag(Varyings input) : SV_Target
            {
                return _Color;
            }
            ENDCG
        }
    }

    FallBack "Diffuse"
}
