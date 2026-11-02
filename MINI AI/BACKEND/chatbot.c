
#include <stdio.h>
#include <string.h>
#include <ctype.h>
#include "chatbot.h"

void getResponse(const char *message, char *response)
{
    FILE *file;
    char line[1000];
    char question[500];
    char answer[500];

    char input[500];

    snprintf(input, sizeof(input), "%s", message);

    for (int i = 0; input[i]; i++)
    {
        input[i] = (char)tolower((unsigned char)input[i]);
    }

    file = fopen("../database/knowledge.txt", "r");

    if (file == NULL)
    {
        strcpy(response, "Knowledge database not found!");
        return;
    }

    while (fgets(line, sizeof(line), file))
    {
        char *separator = strchr(line, '|');

        if (separator == NULL)
            continue;

        *separator = '\0';

        snprintf(question, sizeof(question), "%s", line);

        snprintf(answer, sizeof(answer), "%s", separator + 1);

        // Remove newline from answer
        answer[strcspn(answer, "\r\n")] = '\0';

        // Convert saved question to lowercase
        for (int i = 0; question[i]; i++)
        {
            question[i] = (char)tolower((unsigned char)question[i]);
        }

        if (strcmp(input, question) == 0)
        {
            strcpy(response, answer);
            fclose(file);
            return;
        }
    }

    fclose(file);

    strcpy(response,
        "I don't know this answer yet. Please teach me something new!");
}
