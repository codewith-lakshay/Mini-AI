
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <winsock2.h>
#include "chatbot.h"

#define PORT 8080

// Send HTTP response
void sendResponse(SOCKET client, int status, const char *body)
{
    char header[12000];

    const char *statusText =
        status == 200 ? "200 OK" : "400 Bad Request";

    int bodyLength = (int)strlen(body);

    int headerLength = snprintf(header, sizeof(header),
        "HTTP/1.1 %s\r\n"
        "Content-Type: application/json; charset=utf-8\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
        "Access-Control-Allow-Headers: Content-Type\r\n"
        "Connection: close\r\n"
        "Content-Length: %d\r\n\r\n",
        statusText, bodyLength);

    send(client, header, headerLength, 0);
    send(client, body, bodyLength, 0);
}

// Extract JSON string field
int extractValue(const char *json, const char *field,
                 char *output, int maxSize)
{
    char key[100];

    snprintf(key, sizeof(key), "\"%s\"", field);

    const char *p = strstr(json, key);

    if (p == NULL)
        return 0;

    p = strchr(p, ':');

    if (p == NULL)
        return 0;

    p++;

    while (*p == ' ' || *p == '\t')
        p++;

    if (*p != '"')
        return 0;

    p++;

    int i = 0;

    while (*p && *p != '"' && i < maxSize - 1)
    {
        if (*p == '\\' && *(p + 1))
        {
            p++;

            if (*p == 'n' || *p == 'r')
                output[i++] = ' ';
            else
                output[i++] = *p;
        }
        else
        {
            output[i++] = *p;
        }

        p++;
    }

    output[i] = '\0';

    return 1;
}

// Escape text for JSON
void jsonEscape(const char *input, char *output, int maxSize)
{
    int j = 0;

    for (int i = 0; input[i] && j < maxSize - 3; i++)
    {
        if (input[i] == '"' || input[i] == '\\')
        {
            output[j++] = '\\';
            output[j++] = input[i];
        }
        else if (input[i] == '\n')
        {
            output[j++] = '\\';
            output[j++] = 'n';
        }
        else if (input[i] == '\r')
        {
            output[j++] = '\\';
            output[j++] = 'r';
        }
        else if ((unsigned char)input[i] >= 32)
        {
            output[j++] = input[i];
        }
    }

    output[j] = '\0';
}

// Save new knowledge
void addKnowledge(SOCKET client, const char *json)
{
    char question[500] = {0};
    char answer[500] = {0};

    if (!extractValue(json, "question", question, sizeof(question)) ||
        !extractValue(json, "answer", answer, sizeof(answer)))
    {
        sendResponse(client, 400,
            "{\"reply\":\"Question or answer is missing.\"}");
        return;
    }

    if (strlen(question) == 0 || strlen(answer) == 0)
    {
        sendResponse(client, 400,
            "{\"reply\":\"Question and answer cannot be empty.\"}");
        return;
    }

    for (int i = 0; question[i]; i++)
    {
        if (question[i] == '|' ||
            question[i] == '\n' ||
            question[i] == '\r')
            question[i] = ' ';
    }

    for (int i = 0; answer[i]; i++)
    {
        if (answer[i] == '|' ||
            answer[i] == '\n' ||
            answer[i] == '\r')
            answer[i] = ' ';
    }

    FILE *file = fopen("../database/knowledge.txt", "a");

    if (file == NULL)
    {
        sendResponse(client, 400,
            "{\"reply\":\"Could not open knowledge database.\"}");
        return;
    }

    fprintf(file, "%s|%s\n", question, answer);
    fclose(file);

    printf("\nNew knowledge saved!\n");
    printf("Question: %s\n", question);
    printf("Answer: %s\n", answer);

    sendResponse(client, 200,
        "{\"reply\":\"Knowledge saved successfully!\"}");
}

// Get all saved knowledge
void getAllKnowledge(SOCKET client)
{
    FILE *file = fopen("../database/knowledge.txt", "r");

    if (file == NULL)
    {
        sendResponse(client, 400,
            "{\"reply\":\"Knowledge database not found.\"}");
        return;
    }

    char body[7000];
    char line[1000];

    strcpy(body, "{\"knowledge\":[");

    int first = 1;

    while (fgets(line, sizeof(line), file))
    {
        line[strcspn(line, "\r\n")] = '\0';

        char *separator = strchr(line, '|');

        if (separator == NULL)
            continue;

        *separator = '\0';

        char safeQuestion[2000];
        char safeAnswer[2000];
        char item[4500];

        jsonEscape(line, safeQuestion, sizeof(safeQuestion));
        jsonEscape(separator + 1, safeAnswer, sizeof(safeAnswer));

        snprintf(item, sizeof(item),
            "%s{\"question\":\"%s\",\"answer\":\"%s\"}",
            first ? "" : ",",
            safeQuestion,
            safeAnswer);

        if (strlen(body) + strlen(item) + 3 >= sizeof(body))
            break;

        strcat(body, item);
        first = 0;
    }

    fclose(file);

    strcat(body, "]}");

    sendResponse(client, 200, body);
}

// Main server
int main()
{
    WSADATA wsa;
    SOCKET server, client;
    struct sockaddr_in address;

    char buffer[8192];

    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0)
    {
        printf("Winsock startup failed!\n");
        return 1;
    }

    server = socket(AF_INET, SOCK_STREAM, 0);

    if (server == INVALID_SOCKET)
    {
        printf("Socket creation failed!\n");
        WSACleanup();
        return 1;
    }

    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(PORT);

    if (bind(server, (struct sockaddr *)&address,
             sizeof(address)) == SOCKET_ERROR)
    {
        printf("Port binding failed! Is another server running?\n");
        closesocket(server);
        WSACleanup();
        return 1;
    }

    if (listen(server, 5) == SOCKET_ERROR)
    {
        printf("Listen failed!\n");
        closesocket(server);
        WSACleanup();
        return 1;
    }

    printf("MINI AI Server running at http://localhost:8080\n");

    while (1)
    {
        int addrlen = sizeof(address);

        client = accept(server,
            (struct sockaddr *)&address, &addrlen);

        if (client == INVALID_SOCKET)
            continue;

        int total = 0;
        int headerEnd = -1;

        // Read HTTP headers
        while (total < (int)sizeof(buffer) - 1)
        {
            int n = recv(client, buffer + total,
                (int)sizeof(buffer) - 1 - total, 0);

            if (n <= 0)
                break;

            total += n;
            buffer[total] = '\0';

            char *p = strstr(buffer, "\r\n\r\n");

            if (p != NULL)
            {
                headerEnd = (int)(p - buffer) + 4;
                break;
            }
        }

        if (headerEnd == -1)
        {
            closesocket(client);
            continue;
        }

        // Read Content-Length
        int contentLength = 0;

        char *lengthHeader = strstr(buffer, "Content-Length:");

        if (lengthHeader != NULL)
            contentLength = atoi(lengthHeader + 15);

        if (contentLength < 0 ||
            contentLength > (int)sizeof(buffer) - headerEnd - 1)
        {
            closesocket(client);
            continue;
        }

        // Read remaining request body
        while (total < headerEnd + contentLength)
        {
            int n = recv(client, buffer + total,
                (int)sizeof(buffer) - 1 - total, 0);

            if (n <= 0)
                break;

            total += n;
            buffer[total] = '\0';
        }

        buffer[total] = '\0';

        printf("\nRequest received:\n%s\n", buffer);
        fflush(stdout);

        char method[10] = {0};
        char path[100] = {0};

        sscanf(buffer, "%9s %99s", method, path);

        printf("Method: %s\n", method);
        printf("Path: %s\n", path);

        if (strcmp(method, "OPTIONS") == 0)
        {
            sendResponse(client, 200, "{}");
        }
        else if (strcmp(method, "POST") == 0 &&
                 strcmp(path, "/chat") == 0)
        {
            char message[500] = {0};
            char response[500] = {0};
            char safeResponse[1100];
            char body[1200];

            char *start = buffer + headerEnd;

            if (extractValue(start, "message",
                             message, sizeof(message)))
            {
                getResponse(message, response);

                jsonEscape(response, safeResponse,
                           sizeof(safeResponse));

                snprintf(body, sizeof(body),
                    "{\"reply\":\"%s\"}", safeResponse);

                sendResponse(client, 200, body);
            }
            else
            {
                sendResponse(client, 400,
                    "{\"reply\":\"Invalid chat message.\"}");
            }
        }
        else if (strcmp(method, "POST") == 0 &&
                 strcmp(path, "/add-knowledge") == 0)
        {
            char *start = buffer + headerEnd;
            addKnowledge(client, start);
        }
        else if (strcmp(method, "GET") == 0 &&
                 (strcmp(path, "/knowledge") == 0 ||
                  strcmp(path, "/knowledge/") == 0))
        {
            getAllKnowledge(client);
        }
        else
        {
            sendResponse(client, 400,
                "{\"reply\":\"Unknown request.\"}");
        }

        closesocket(client);
    }

    closesocket(server);
    WSACleanup();

    return 0;
}
