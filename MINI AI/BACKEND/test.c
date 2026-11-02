#include <stdio.h>
#include "chatbot.h"

int main()
{
    char message[500];
    char response[500];

    printf("================================\n");
    printf("       MINI AI CHATBOT\n");
    printf("================================\n");

    printf("You: ");
    fgets(message, sizeof(message), stdin);

    getResponse(message, response);

    printf("MINI AI: %s\n", response);

    return 0;
}