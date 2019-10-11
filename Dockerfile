FROM node:10

LABEL com.github.actions.name="Typescript checks"
LABEL com.github.actions.description=""
LABEL com.github.actions.icon="code"
LABEL com.github.actions.color="yellow"

COPY . /action
ENTRYPOINT ["/action/entrypoint.sh"]
