# Ticket Finder - LampProject Group 5 

### Instructions for Accessing the Droplet

```bash
ssh your_name@tix.arielfevry.com
cd /var/www
git clone repo@github.com
```
### Pushing and Pulling code

When making any changes to the repository files, make sure to check out a branch to your local machine using this command:
```bash
git checkout -b <your-branch-name>
git pull # when making changes, make sure to pull often to remain up-to-date
```
You can then make your changes, stage them, commit, and push to main. 
```bash
git add <file-name> or . # "git add ." stages all modifications
git commit -m "commit message"
git push
```

###  Commit Framework
- feat: (explanation of new feature added)
- fix: (what the commit is fixing)
- style: (formatting, typo changes)
- tests: (adding tests and what they are)
