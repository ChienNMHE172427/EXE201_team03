FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["code/TravelWorkspace.API/TravelWorkspace.API.csproj", "code/TravelWorkspace.API/"]
RUN dotnet restore "code/TravelWorkspace.API/TravelWorkspace.API.csproj"
COPY code/TravelWorkspace.API/ code/TravelWorkspace.API/
WORKDIR /src/code/TravelWorkspace.API
RUN dotnet build "TravelWorkspace.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "TravelWorkspace.API.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "TravelWorkspace.API.dll"]
