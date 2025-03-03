RED=\033[31m
GREEN=\033[32m
YELLOW=\033[33m
BLUE=\033[34m
CYAN=\033[36m
RESET=\033[0m
BOLD=\033[1m

all:
	@echo ""
	@echo "$(BOLD)$(BLUE)╔══════════════════════════════════════════════════╗$(RESET)"
	@echo "$(BOLD)$(BLUE)║             Available make commands              ║$(RESET)"
	@echo "$(BOLD)$(BLUE)╠══════════════════════════════════════════════════╣$(RESET)"
	@echo "$(BOLD)$(BLUE)║ $(GREEN)make up        $(RESET)$(CYAN)    # Start the containers$(RESET)        $(BOLD)$(BLUE)║$(RESET)"
	@echo "$(BOLD)$(BLUE)║ $(GREEN)make build     $(RESET)$(CYAN)    # Build the containers$(RESET)        $(BOLD)$(BLUE)║$(RESET)"
	@echo "$(BOLD)$(BLUE)║ $(GREEN)make rebuild   $(RESET)$(CYAN)    # Rebuild the containers$(RESET)      $(BOLD)$(BLUE)║$(RESET)"
	@echo "$(BOLD)$(BLUE)║ $(RED)make stop      $(RESET)$(CYAN)    # Stop the containers$(RESET)         $(BOLD)$(BLUE)║$(RESET)"
	@echo "$(BOLD)$(BLUE)║ $(RED)make down      $(RESET)$(CYAN)    # Bring down the containers$(RESET)   $(BOLD)$(BLUE)║$(RESET)"
	@echo "$(BOLD)$(BLUE)║ $(CYAN)make logs      $(RESET)$(CYAN)    # View the logs$(RESET)               $(BOLD)$(BLUE)║$(RESET)"
	@echo "$(BOLD)$(BLUE)║ $(CYAN)make status    $(RESET)$(CYAN)    # Check container status$(RESET)      $(BOLD)$(BLUE)║$(RESET)"
	@echo "$(BOLD)$(BLUE)║ $(BLUE)make clean     $(RESET)$(CYAN)    # Clean temporary files$(RESET)       $(BOLD)$(BLUE)║$(RESET)"
	@echo "$(BOLD)$(BLUE)║ $(BLUE)make fclean    $(RESET)$(CYAN)    # Full clean$(RESET)                  $(BOLD)$(BLUE)║$(RESET)"
	@echo "$(BOLD)$(BLUE)║ $(YELLOW)make re        $(RESET)$(CYAN)    # Rebuild everything$(RESET)          $(BOLD)$(BLUE)║$(RESET)"
	@echo "$(BOLD)$(BLUE)╚══════════════════════════════════════════════════╝$(RESET)"
	@echo ""

up:
	docker-compose -f docker-compose.yml up -d

build:
	docker-compose -f docker-compose.yml build

rebuild:
	docker-compose -f docker-compose.yml build --no-cache

stop:
	docker-compose -f docker-compose.yml stop

down:
	docker-compose -f docker-compose.yml down

logs:
	docker-compose -f docker-compose.yml logs

status:
	docker-compose -f docker-compose.yml ps

clean:
	docker-compose -f docker-compose.yml down --rmi all --volumes

fclean: clean

re:
	make clean
	make rebuild
	make up

.PHONY: up build rebuild stop down logs status clean fclean re