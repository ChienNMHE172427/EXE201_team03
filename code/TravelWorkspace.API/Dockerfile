FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["TravelWorkspace.API.csproj", "./"]
RUN dotnet restore "TravelWorkspace.API.csproj"
COPY . .
RUN dotnet build "TravelWorkspace.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "TravelWorkspace.API.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "TravelWorkspace.API.dll"]
