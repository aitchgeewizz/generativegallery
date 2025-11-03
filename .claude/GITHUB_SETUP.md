# 🚀 GitHub Setup Guide

## Step 1: Create GitHub Repository

1. **Go to GitHub**: https://github.com/new

2. **Repository Settings**:
   - **Owner**: Your GitHub username
   - **Repository name**: Choose one from naming ideas:
     - `canvas-candy`
     - `gallery-glide`
     - `muse-maze`
     - Or your custom choice

   - **Description**: "Generative art & design exhibition platform with infinite canvas browsing"

   - **Visibility**:
     - ✅ **Public** (recommended - showcases your work)
     - ⬜ Private (if you want to keep it secret for now)

   - **Initialize**:
     - ⬜ **Do NOT** check "Add a README file"
     - ⬜ **Do NOT** check "Add .gitignore"
     - ⬜ **Do NOT** choose a license yet

     *(We already have these files locally)*

3. **Click "Create repository"**

## Step 2: Connect Local Repository to GitHub

After creating the repository, GitHub will show you instructions. We'll use the "push an existing repository" method.

**Copy your repository URL**. It will look like:
```
https://github.com/YOUR-USERNAME/REPO-NAME.git
```

Then run these commands in your terminal:

```bash
# Add GitHub as remote (replace with your actual URL)
git remote add origin https://github.com/YOUR-USERNAME/REPO-NAME.git

# Verify remote was added
git remote -v

# Push to GitHub (first time)
git push -u origin main
```

If you get an error about "main" vs "master", run:
```bash
# Rename branch to main
git branch -M main

# Then push
git push -u origin main
```

## Step 3: Verify Upload

1. **Refresh your GitHub repository page**
2. **You should see**:
   - All your source files
   - README.md
   - .gitignore
   - Recent commit message

3. **Verify .env is NOT uploaded** (it should be ignored)

## Step 4: Set Up Branch Protection (Optional)

For safety, you can protect your main branch:

1. Go to **Settings** → **Branches**
2. Click **Add branch protection rule**
3. Branch name pattern: `main`
4. Check: "Require pull request before merging"
5. Save

This prevents accidental direct commits to main.

## Step 5: Add Repository Description & Topics

Make your repo discoverable:

1. Go to repository homepage
2. Click **⚙️** (gear icon) next to "About"
3. Add:
   - **Description**: "Generative art & design exhibition platform"
   - **Website**: (your deployed URL, if you have one)
   - **Topics**:
     - `react`
     - `typescript`
     - `museum-api`
     - `infinite-canvas`
     - `generative-art`
     - `framer-motion`
     - `art-gallery`
     - `design-portfolio`

## Step 6: Future Workflow

### Daily Work
```bash
# Check what changed
git status

# Stage files
git add .

# Or stage specific files
git add src/components/NewComponent.tsx

# Commit with message
git commit -m "Add new feature: generative exhibitions"

# Push to GitHub
git push
```

### Working with Branches (Recommended)
```bash
# Create feature branch
git checkout -b feature/generative-exhibitions

# Make changes, commit them
git add .
git commit -m "Implement exhibition generation"

# Push branch to GitHub
git push -u origin feature/generative-exhibitions

# On GitHub: Create Pull Request
# After review: Merge to main
# Then locally:
git checkout main
git pull
```

## Troubleshooting

### Problem: "Permission denied (publickey)"

**Solution**: Set up SSH keys or use HTTPS with Personal Access Token

**Quick Fix** (HTTPS):
1. Go to Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. Use token as password when pushing

### Problem: "Repository not found"

**Solution**: Check remote URL
```bash
git remote -v
# If wrong:
git remote set-url origin https://github.com/CORRECT-USERNAME/CORRECT-REPO.git
```

### Problem: Large files won't upload

**Solution**: Some files might be too large for GitHub (>100MB)
```bash
# Check file sizes
find . -type f -size +50M

# If needed, add to .gitignore and remove from git
git rm --cached path/to/large/file
echo "path/to/large/file" >> .gitignore
git commit -m "Remove large file from tracking"
```

## Next Steps

After GitHub is set up:

1. ✅ Repository is live and backed up
2. ✅ You can revert to any previous version
3. ✅ Ready to collaborate (if needed)
4. ✅ Can deploy to Vercel/Netlify directly from GitHub

**Recommendation**:
- Commit after each significant feature
- Push to GitHub at end of each work session
- Write clear commit messages (future you will thank you!)

## Useful Git Commands

```bash
# See commit history
git log --oneline

# See what changed in last commit
git show

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all local changes (CAREFUL!)
git reset --hard HEAD

# See differences before committing
git diff

# Create and switch to new branch
git checkout -b branch-name

# Switch between branches
git checkout main
git checkout feature-branch

# Pull latest changes from GitHub
git pull
```

---

**Status**: Ready for GitHub! 🎉
