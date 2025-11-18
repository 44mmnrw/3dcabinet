// Fresnel vertex shader
// Computes world-space normal and view direction for Fresnel term

varying vec3 vWorldNormal;
varying vec3 vViewDir;

void main() {
    // World position
    vec4 worldPos = modelMatrix * vec4(position, 1.0);

    // World normal
    mat3 normalMat = mat3(modelMatrix);
    vWorldNormal = normalize(normalMat * normal);

    // View direction in world space
    vViewDir = normalize(cameraPosition - worldPos.xyz);

    // Standard projection
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}