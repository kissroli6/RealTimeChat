using Microsoft.EntityFrameworkCore;
using RealTimeChat.Api.Data;
using RealTimeChat.Api.Hubs;

var builder = WebApplication.CreateBuilder(args);

// ---------- SERVICES ----------
builder.Services.AddControllers();

builder.Services.AddDbContext<ChatDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddSignalR();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS – Vite frontend (http://localhost:5173) engedése, credentailsszel
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendCors", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173", "http://localhost:5174")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

// ---------- MIDDLEWARE PIPELINE ----------
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// http → https átdobás
app.UseHttpsRedirection();

// routing + CORS MINDENKÉPP az endpointok ELŐTT
app.UseRouting();

app.UseCors("FrontendCors");

app.UseAuthorization();

// ---------- ENDPOINTS ----------
app.MapControllers();

// Hub endpoint – ugyanaz az útvonal, amit a front használ
app.MapHub<ChatHub>("/hubs/chat").RequireCors("FrontendCors");

app.Run();
