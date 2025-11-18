// Fresnel fragment shader
// Additive-style rim light with controllable power/intensity/opacity

precision mediump float;

varying vec3 vWorldNormal;
varying vec3 vViewDir;

uniform vec3 uColor;      // highlight color
uniform float uPower;     // sharpness of rim (2.0 - 5.0 typical)
uniform float uIntensity; // brightness multiplier
uniform float uOpacity;   // final alpha multiplier
uniform float uTime;      // reserved for future animated effects

void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(vViewDir);

    // Fresnel term: stronger on grazing angles
    float ndotv = max(0.0, dot(N, V));
    float fresnel = pow(1.0 - ndotv, max(0.0001, uPower));

    vec3 color = uColor * fresnel * uIntensity;
    float alpha = clamp(fresnel * uOpacity, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
}