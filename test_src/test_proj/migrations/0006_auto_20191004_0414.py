# Generated by Django 2.2.4 on 2019-10-04 04:14

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('test_proj', '0005_auto_20190912_0347'),
    ]

    operations = [
        migrations.AddField(
            model_name='modelwithbinaryfiles',
            name='some_multiplenamedbinfile',
            field=models.TextField(default=''),
        ),
        migrations.AddField(
            model_name='modelwithbinaryfiles',
            name='some_multiplenamedbinimage',
            field=models.TextField(default=''),
        ),
    ]
