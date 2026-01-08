import swaggerJSDoc from "swagger-jsdoc";
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Chat & Analytics API",
      version: "1.0.0",
      description: "APIs documentation",
    },
    servers: [
      {
        url: "/",
        description: "Local Server",
      },
    ],
    components: {
      schemas: {
        RegisterInput: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string", example: "sample" },
            email: { type: "string", example: "sample@gmail.com" },
            password: { type: "string", example: "Test123" },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/docs/swagger/*.yaml"],
};
export default swaggerJSDoc(options);
